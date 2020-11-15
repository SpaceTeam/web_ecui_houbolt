FROM ubuntu:18.04

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Set debconf to run non-interactively
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# Install base dependencies
RUN apt-get update && apt-get install -y -q --no-install-recommends \
        apt-transport-https \
        build-essential \
        ca-certificates \
        curl \
        git \
        libssl-dev \
        wget \
    && rm -rf /var/lib/apt/lists/*

ENV NVM_DIR /.nvm
ENV NODE_VERSION 12.10.0

RUN mkdir $NVM_DIR

COPY package.json /

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && npm install

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

WORKDIR /TXV_ECUI_WEB

EXPOSE  80
EXPOSE  5555
CMD ["/.nvm/versions/node/v12.10.0/bin/node", "server.js"]