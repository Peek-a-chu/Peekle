FROM nginx:alpine

# Install openssl
RUN apk add --no-cache openssl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Create directory for certificates
RUN mkdir -p /etc/letsencrypt/live/i14a408.p.ssafy.io

# Script to generate self-signed cert if not exists
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
