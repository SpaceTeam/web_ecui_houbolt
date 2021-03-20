#!/bin/bash

cd "$(dirname "$0")"

git pull

sudo systemctl restart ecui-web-large-teststand.service
sudo systemctl restart ecui-web-small-teststand.service
sudo systemctl restart ecui-web-small-oxfill.service