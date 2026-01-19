#!/bin/bash

# 0. Register Admin (Ignore if exists)
echo "Registering Admin..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Test Org",
    "email": "admin@example.com",
    "password": "password",
    "firstName": "Admin",
    "lastName": "User"
  }' > /dev/null

# 1. Login to get JWT
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com", "password": "password123"}' | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Login failed. Please check credentials."
  echo "Response: $(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "admin@acme.com", "password": "password123"}')"
  exit 1
fi

echo "Got Token: ${TOKEN:0:10}..."

# 2. Upload CSV
echo "Uploading CSV..."
curl -X POST http://localhost:3000/api/users/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@demo_users.csv;type=text/csv"

echo -e "\nDone."
