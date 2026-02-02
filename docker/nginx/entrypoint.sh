#!/bin/sh

DOMAIN="${DOMAIN_NAME:-i14a408.p.ssafy.io}"
EMAIL="${SSL_EMAIL:-admin@$DOMAIN}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
WEBROOT="/var/www/certbot"
STAGING="${CERTBOT_STAGING:-0}"

# 1. Create necessary directories
mkdir -p "$CERT_DIR"
mkdir -p "$WEBROOT"

echo "Nginx+Certbot Container Setup"
echo "================================"

# 2. Check for missing certs and generate self-signed if needed
# (Nginx will crash if the ssl_certificate file doesn't exist)
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "No certificate found. Generating self-signed placeholder..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"
    echo "Placeholder created."
fi

# 3. Start Nginx in background to handle challenge requests
echo "Starting Nginx in background..."
nginx

# 4. Attempt to obtain Let's Encrypt certificate
echo "Checking SSL certificate status..."
# Check if it is a real Let's Encrypt certificate
ISSUER=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -issuer 2>/dev/null)

if echo "$ISSUER" | grep -q "Let's Encrypt"; then
    # It is a Let's Encrypt cert, check expiration
    if openssl x509 -checkend 86400 -noout -in "$CERT_DIR/fullchain.pem" 2>/dev/null; then
        echo "Valid Let's Encrypt certificate exists. Skipping issuance."
        SKIP_ISSUANCE="true"
    else
        echo "Let's Encrypt certificate is expiring soon."
        SKIP_ISSUANCE="false"
    fi
else
    # It is likely a self-signed placeholder
    echo "Placeholder certificate detected (Issuer: $ISSUER). Proceeding with issuance..."
    SKIP_ISSUANCE="false"
fi

if [ "$SKIP_ISSUANCE" != "true" ]; then
    echo "Requesting Let's Encrypt certificate..."
    
    # Removed --force-renewal to let certbot decide if renewal is needed
    CERTBOT_ARGS="certonly --webroot -w $WEBROOT -d $DOMAIN --email $EMAIL --agree-tos --non-interactive"
    if [ "$STAGING" = "1" ]; then
        echo "Running in STAGING mode"
        CERTBOT_ARGS="$CERTBOT_ARGS --staging"
    fi

    if certbot $CERTBOT_ARGS; then
        echo "Certificate obtained successfully!"
        echo "Reloading Nginx config..."
        nginx -s reload
    else
        echo "Certbot failed. Falling back to self-signed certificate."
    fi
fi

# 5. Start background renewal loop
echo "Starting renewal scheduler (every 12h)..."
(
    while :; do
        sleep 12h
        echo "Checking for certificate renewal..."
        certbot renew --webroot -w $WEBROOT --deploy-hook "nginx -s reload"
    done
) &

# 6. Stop background nginx and switch to foreground main process
echo "Stopping background Nginx..."
nginx -s stop
sleep 2

echo "Starting Nginx in foreground..."
exec "$@"
