#!/bin/bash

cd "$(dirname "$0")"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm install 12.10.0
npm install

sudo cp ecui-web-small-oxfill-small-teststand.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ecui-web-small-oxfill-small-teststand.service
sudo systemctl start ecui-web-small-oxfill-small-teststand.service
sudo systemctl status ecui-web-small-oxfill-small-teststand.service

sudo chmod +x update.sh
./update.sh

