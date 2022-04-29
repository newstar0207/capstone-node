#!/bin/sh

touch .env
echo 'MONGO_URL=${{ secrets.MONGO_URL }}' >> .env
echo 'NODE_ENV=${{ secrets.NODE_ENV }}' >> .env
cat .env