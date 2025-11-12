pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AlumniNetwork is ZamaEthereumConfig {
    struct AlumniRecord {
        string encryptedAlmaMater;
        euint32 encryptedGraduationYear;
        uint256 publicDonationAmount;
        string encryptedCurrentPosition;
        address owner;
        uint256 creationTimestamp;
        uint32 decryptedGraduationYear;
        bool isVerified;
    }

    mapping(string => AlumniRecord) public alumniRecords;
    string[] public alumniIds;

    event AlumniRecordCreated(string indexed alumniId, address indexed owner);
    event VerificationCompleted(string indexed alumniId, uint32 decryptedYear);

    constructor() ZamaEthereumConfig() {
        // Initialize contract with Zama configuration
    }

    function createAlumniRecord(
        string calldata alumniId,
        string calldata encryptedAlmaMater,
        externalEuint32 encryptedGraduationYear,
        bytes calldata inputProof,
        uint256 publicDonationAmount,
        string calldata encryptedCurrentPosition
    ) external {
        require(bytes(alumniRecords[alumniId].encryptedAlmaMater).length == 0, "Record already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedGraduationYear, inputProof)), "Invalid encrypted input");

        alumniRecords[alumniId] = AlumniRecord({
            encryptedAlmaMater: encryptedAlmaMater,
            encryptedGraduationYear: FHE.fromExternal(encryptedGraduationYear, inputProof),
            publicDonationAmount: publicDonationAmount,
            encryptedCurrentPosition: encryptedCurrentPosition,
            owner: msg.sender,
            creationTimestamp: block.timestamp,
            decryptedGraduationYear: 0,
            isVerified: false
        });

        FHE.allowThis(alumniRecords[alumniId].encryptedGraduationYear);
        FHE.makePubliclyDecryptable(alumniRecords[alumniId].encryptedGraduationYear);

        alumniIds.push(alumniId);
        emit AlumniRecordCreated(alumniId, msg.sender);
    }

    function verifyAlumni(
        string calldata alumniId,
        bytes memory abiEncodedClearYear,
        bytes memory decryptionProof
    ) external {
        require(bytes(alumniRecords[alumniId].encryptedAlmaMater).length > 0, "Record does not exist");
        require(!alumniRecords[alumniId].isVerified, "Already verified");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(alumniRecords[alumniId].encryptedGraduationYear);

        FHE.checkSignatures(cts, abiEncodedClearYear, decryptionProof);
        uint32 decodedYear = abi.decode(abiEncodedClearYear, (uint32));

        alumniRecords[alumniId].decryptedGraduationYear = decodedYear;
        alumniRecords[alumniId].isVerified = true;
        emit VerificationCompleted(alumniId, decodedYear);
    }

    function getEncryptedGraduationYear(string calldata alumniId) external view returns (euint32) {
        require(bytes(alumniRecords[alumniId].encryptedAlmaMater).length > 0, "Record does not exist");
        return alumniRecords[alumniId].encryptedGraduationYear;
    }

    function getAlumniRecord(string calldata alumniId) external view returns (
        string memory encryptedAlmaMater,
        uint256 publicDonationAmount,
        string memory encryptedCurrentPosition,
        address owner,
        uint256 creationTimestamp,
        bool isVerified,
        uint32 decryptedGraduationYear
    ) {
        require(bytes(alumniRecords[alumniId].encryptedAlmaMater).length > 0, "Record does not exist");
        AlumniRecord storage record = alumniRecords[alumniId];

        return (
            record.encryptedAlmaMater,
            record.publicDonationAmount,
            record.encryptedCurrentPosition,
            record.owner,
            record.creationTimestamp,
            record.isVerified,
            record.decryptedGraduationYear
        );
    }

    function getAllAlumniIds() external view returns (string[] memory) {
        return alumniIds;
    }

    function serviceStatus() public pure returns (bool operational) {
        operational = true;
    }
}

