#!/bin/bash

cd "$(dirname "$0")"

git pull

sudo systemctl stop ecui-web.service
sudo systemctl start ecui-web.service