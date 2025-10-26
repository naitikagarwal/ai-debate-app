// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract ResultStorage {
    struct ResultRecord {
        uint256 debateId;
        string hashValue;
        uint256 timestamp;
    }

    mapping(uint256 => ResultRecord) private records;

    event ResultStored(uint256 debateId, string hashValue, uint256 timestamp);

    function storeResult(uint256 debateId, string memory hashValue) public {
        require(records[debateId].timestamp == 0, "Result already stored");
        records[debateId] = ResultRecord(debateId, hashValue, block.timestamp);
        emit ResultStored(debateId, hashValue, block.timestamp);
    }

    function getResult(uint256 debateId)
        public
        view
        returns (uint256 , string memory, uint256)
    {
        ResultRecord memory rec = records[debateId];
        return (rec.debateId, rec.hashValue, rec.timestamp);
    }
}

