# Private Alumni Network

The Private Alumni Network is a privacy-preserving social platform that empowers alumni to connect and collaborate while safeguarding their personal and professional identities, utilizing Zama's Fully Homomorphic Encryption (FHE) technology.

## The Problem

In today’s interconnected world, protecting personal data is paramount. Traditional alumni networks expose sensitive information that can lead to privacy breaches and unwanted solicitations. Alumni often hesitate to share their credentials, fearing misuse or exposure of their professional roles. This creates a barrier to meaningful connections, charitable donations, and support among alumni, ultimately hindering community growth. Cleartext data not only risks individual privacy but can also undermine the integrity of the alumni community.

## The Zama FHE Solution

By leveraging the power of Fully Homomorphic Encryption (FHE), our platform allows for computation on encrypted data. This means alumni can verify their credentials and engage in social interactions without exposing their cleartext information. Using Zama’s innovative libraries, such as fhevm, we enable alumni to maintain control over their privacy, ensuring that sensitive information, such as employment positions and personal details, remain confidential while still facilitating necessary interactions.

## Key Features

- 🔒 **Encrypted Identity Verification**: Validate alumni identities safely without revealing their actual credentials.
- 🤝 **Anonymous Donations**: Facilitate contributions to fellow alumni or causes without disclosing donor identities.
- 🗣️ **Secure Social Interactions**: Engage in discussions and interactions while keeping personal data protected.
- 📊 **Encrypted Resource Matching**: Connect alumni with resources and opportunities without compromising sensitive information.
- 🗺️ **Dynamic Alumni Mapping**: Visualize alumni interactions and connections in a secure and private manner.

## Technical Architecture & Stack

The Private Alumni Network employs a robust technical stack designed to ensure security, scalability, and seamless user experience:

- **Core Privacy Engine**: Zama’s FHE technologies (fhevm)
- **Frontend**: React for building dynamic user interfaces
- **Backend**: Node.js for server-side logic
- **Database**: Secure data management with encrypted storage solutions

## Smart Contract / Core Logic

Below is a simplified example showing how we manage encrypted identity verification using Zama's technology within a smart contract:

```solidity
pragma solidity ^0.8.0;

import "TFHE.sol";

contract AlumniNetwork {
    struct Alumni {
        uint64 id;
        bytes encryptedCredential;
    }

    mapping(uint64 => Alumni) public alumniRegistry;

    function registerAlumni(uint64 _id, bytes memory _encryptedCredential) public {
        alumniRegistry[_id] = Alumni(_id, _encryptedCredential);
    }

    function verifyAlumni(uint64 _id, bytes memory _encryptedCredential) public view returns (bool) {
        bytes memory storedCredential = alumniRegistry[_id].encryptedCredential;
        return TFHE.decrypt(storedCredential) == TFHE.decrypt(_encryptedCredential);
    }
}
```

This snippet illustrates how alumni data is registered and verified while remaining encrypted, thus protecting individual privacy.

## Directory Structure

The structure of the Private Alumni Network project is as follows:

```
/private-alumni-network
├── /src
│   ├── /components
│   ├── /pages
│   └── App.js
├── /contracts
│   └── AlumniNetwork.sol
├── /scripts
│   └── verify_alumni.py
├── package.json
└── README.md
```

This directory structure helps maintain organization, with clear separation between the frontend components, backend logic, smart contracts, and scripts for encrypted data processing.

## Installation & Setup

### Prerequisites

To get started, make sure you have the following installed on your machine:

- Node.js
- npm
- Python 3.x
- A local development environment for smart contracts (like Hardhat)

### Install Dependencies

Install the required dependencies:

```bash
npm install # for frontend and backend
pip install concrete-ml # for encrypted machine learning tasks
```

Ensure you have Zama’s libraries installed, which provide the necessary encryption capabilities.

## Build & Run

To build and run the application, follow these standard commands:

1. Compile the smart contracts:

```bash
npx hardhat compile
```

2. Start the server:

```bash
npm start
```

3. Run the Python script for any necessary encryption tasks:

```bash
python scripts/verify_alumni.py
```

This will set up the Private Alumni Network locally and allow you to begin engaging with the application.

## Acknowledgements

We would like to extend our sincere gratitude to Zama for providing the open-source FHE primitives that make this project possible. Their innovative solutions empower us to create a secure and privacy-preserving environment for alumni everywhere. 

By harnessing Zama's FHE technology, the Private Alumni Network seeks to redefine social interactions among alumni, ensuring that their privacy is respected while facilitating vital connections that can lead to personal and professional growth.