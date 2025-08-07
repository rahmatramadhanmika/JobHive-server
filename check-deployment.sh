#!/bin/bash

# Script to check deployment status on EC2
echo "=== Checking Deployment Status ==="

# Check if PM2 is running
echo "1. Checking PM2 status:"
pm2 status

echo -e "\n2. Checking PM2 logs:"
pm2 logs express-test --lines 20

echo -e "\n3. Checking if application is listening on port:"
netstat -tlnp | grep :3000

echo -e "\n4. Checking Node.js version:"
node --version

echo -e "\n5. Checking if .env file exists:"
ls -la .env

echo -e "\n6. Testing local connection:"
curl -I http://localhost:3000 || echo "Local connection failed"

echo -e "\n7. Checking system resources:"
free -h
df -h

echo -e "\n8. Checking error logs:"
journalctl -u pm2-* --since "1 hour ago" --no-pager
