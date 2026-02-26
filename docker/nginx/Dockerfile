FROM nginx:alpine

# Install certbot, acme.sh dependencies
RUN apk add --no-cache certbot certbot-nginx openssl curl socat

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Create directories for certificates and certbot
RUN mkdir -p /etc/letsencrypt/live/i14a408.p.ssafy.io
RUN mkdir -p /var/www/certbot

# Script to handle certificate setup
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
