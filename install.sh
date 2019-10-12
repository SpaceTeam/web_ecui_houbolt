#!/bin/bash

cd "$(dirname "$0")"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash
nvm install 12.10.0
npm install

sudo cp ecui-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ecui-web.service
sudo systemctl start ecui-web.service
sudo systemctl status ecui-web.service

sudo chmod +x update.sh
./update.sh


