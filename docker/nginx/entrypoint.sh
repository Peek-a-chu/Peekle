#!/bin/sh

DOMAIN="${DOMAIN_NAME:-peekle.today}"
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

# 4. Attempt to obtain SSL certificate
echo "Checking SSL certificate status..."

if [ -f "$CERT_DIR/fullchain.pem" ]; then
    # Check if certificate is valid for at least 7 days (604800 seconds)
    if openssl x509 -checkend 604800 -noout -in "$CERT_DIR/fullchain.pem" 2>/dev/null; then
         ISSUER=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -issuer 2>/dev/null)
         # Check if it's one of our trusted CAs (Let's Encrypt, ZeroSSL, Sectigo, Buypass, etc.)
         # Self-signed placeholder usually has Issuer == Subject (CN=domain)
         if echo "$ISSUER" | grep -qE "Let's Encrypt|ZeroSSL|Sectigo|Buypass"; then
             echo "Valid CA certificate found (Issuer: $ISSUER). Skipping issuance."
             SKIP_ISSUANCE="true"
         else
             echo "Certificate is valid time-wise but appears self-signed or unknown CA (Issuer: $ISSUER). Proceeding with issuance..."
             SKIP_ISSUANCE="false"
         fi
    else
         echo "Certificate is expiring within 7 days or invalid. Proceeding with issuance..."
         SKIP_ISSUANCE="false"
    fi
else
    echo "No certificate found. Proceeding with issuance..."
    SKIP_ISSUANCE="false"
fi

if [ "$SKIP_ISSUANCE" != "true" ]; then
    echo "Requesting SSL certificate..."

    # Remove self-signed certificate directory to prevent Certbot from creating a duplicate directory (e.g., -0001)
    # Nginx is holding these files in memory, so it won't crash immediately.
    # When Certbot succeeds, it recreates this directory, and "nginx -s reload" loads the valid certs.
    if [ -d "$CERT_DIR" ]; then
        echo "Removing placeholder certificate to avoid conflict..."
        rm -rf "$CERT_DIR"
    fi
    
    # Removed --force-renewal to let certbot decide if renewal is needed
    CERTBOT_ARGS="certonly --webroot -w $WEBROOT -d $DOMAIN --email $EMAIL --agree-tos --non-interactive"
    if [ "$STAGING" = "1" ]; then
        echo "Running in STAGING mode"
        CERTBOT_ARGS="$CERTBOT_ARGS --staging"
    fi

    # Try acme.sh (ZeroSSL) first as it has no rate limits vs Let's Encrypt
    echo "Installing acme.sh client..."
    # Install acme.sh
    if curl https://get.acme.sh | sh -s email="$EMAIL"; then
        source /root/.acme.sh/acme.sh.env 2>/dev/null
        
        # Set default CA to ZeroSSL
        /root/.acme.sh/acme.sh --set-default-ca --server zerossl
        
        # Issue certificate
        if /root/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$WEBROOT" --server zerossl; then
            echo "Certificate obtained successfully (ZeroSSL)!"
            
            # Install certificate to the path Nginx expects
            mkdir -p "$CERT_DIR"
            /root/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
                --key-file       "$CERT_DIR/privkey.pem"  \
                --fullchain-file "$CERT_DIR/fullchain.pem" \
                --reloadcmd     "nginx -s reload"
                
            echo "Reloading Nginx config..."
            nginx -s reload
        else
            echo "acme.sh (ZeroSSL) failed. Trying Certbot (Let's Encrypt)..."
            if certbot $CERTBOT_ARGS; then
                echo "Certificate obtained successfully (Let's Encrypt)!"
                echo "Reloading Nginx config..."
                nginx -s reload
            else
                echo "Certbot failed. Falling back to self-signed certificate."
                mkdir -p "$CERT_DIR"
                openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                    -keyout "$CERT_DIR/privkey.pem" \
                    -out "$CERT_DIR/fullchain.pem" \
                    -subj "/CN=$DOMAIN"
            fi
        fi
    else
         echo "acme.sh install failed. Trying Certbot..."
         if certbot $CERTBOT_ARGS; then
             echo "Certificate obtained successfully!"
             nginx -s reload
         else
             echo "Certbot failed. Fallback to self-signed."
             mkdir -p "$CERT_DIR"
             openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$CERT_DIR/privkey.pem" \
                -out "$CERT_DIR/fullchain.pem" \
                -subj "/CN=$DOMAIN"
         fi
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
