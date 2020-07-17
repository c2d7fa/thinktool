FROM debian

RUN apt-get update -y
RUN apt-get install -y curl

# Node.js (https://github.com/nodesource/distributions/blob/master/README.md#deb)
RUN curl -sSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

# Docker (https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script)
RUN curl -sSL https://get.docker.com | bash -

# Azure CLI (https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-linux?view=azure-cli-latest)
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash -

# Tmux and Tmuxp (see session.tmuxp.yaml)
RUN apt-get install -y tmux tmuxp

WORKDIR /work
