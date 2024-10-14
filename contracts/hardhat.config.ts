import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0xfdbce6c8b2fbc6ce6c34b8ef9c6b51469f0f9c359dc492a64d87f93b6b2869a8'
      ]
    },
  },
};

export default config;
