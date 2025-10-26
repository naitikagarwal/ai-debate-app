// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract ResultStorage {
    struct ResultRecord {
        string debateId;
        string hashValue;
        uint256 timestamp;
    }

    mapping(string => ResultRecord) private records;

    event ResultStored(string debateId, string hashValue, uint256 timestamp);

    function storeResult(string memory debateId, string memory hashValue) public {
        require(bytes(records[debateId].hashValue).length == 0, "Result already stored");
        records[debateId] = ResultRecord(debateId, hashValue, block.timestamp);
        emit ResultStored(debateId, hashValue, block.timestamp);
    }

    function getResult(string memory debateId)
        public
        view
        returns (string memory, string memory, uint256)
    {
        ResultRecord memory rec = records[debateId];
        return (rec.debateId, rec.hashValue, rec.timestamp);
    }
}

