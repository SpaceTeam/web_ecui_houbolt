# specify the node base image with your desired version node:<version>
FROM node:22
# replace this with your application's default port
EXPOSE 5555
EXPOSE 80

ARG branch=main
ARG ssh_key_path=~/.ssh/id_github

WORKDIR /home

# Update aptitude with new repo
RUN apt-get update

# Install software 
RUN apt-get install -y git

# Make ssh dir
RUN mkdir /root/.ssh/

# Copy over private key, and set permissions
# Warning! Anyone who gets their hands on this image will be able
# to retrieve this private key file from the corresponding image layer
ADD $ssh_key_path /root/.ssh/id_github
RUN  echo "    IdentityFile /root/.ssh/id_github" >> /etc/ssh/ssh_config

# Create known_hosts
RUN touch /root/.ssh/known_hosts
# Add bitbuckets key
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

# Clone the conf files into the docker container
RUN git clone git@github.com:SpaceTeam/web_ecui_houbolt.git
WORKDIR /home/web_ecui_houbolt

RUN ls -la

# WORKDIR /home/web_ecui_houbolt
# RUN ls -la
RUN git checkout $branch
RUN git pull
RUN git submodule init
RUN git submodule update
RUN npm install

RUN chmod +x update.sh
RUN ./update.sh

RUN echo "../config_ecui" >> configPath.txt

ENTRYPOINT ls -la && node server
