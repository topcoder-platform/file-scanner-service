#!/bin/bash
set -eo pipefail
APP_NAME=$1

echo master_deploy.sh . >>.dockerignore
echo buildenv.sh . >>.dockerignore
echo awsconfiguration.sh . >>.dockerignore
#echo awsenvconf >>.dockerignore
#echo buildenvvar >>.dockerignore   

docker build -f Dockerfile -t $APP_NAME:latest .
