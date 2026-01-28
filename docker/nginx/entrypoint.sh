#!/bin/sh

DOMAIN="${DOMAIN_NAME:-i14a408.p.ssafy.io}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "Creating self-signed certificate for $DOMAIN..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"
else
    echo "Certificate already exists for $DOMAIN, skipping generation."
fi

exec "$@"
