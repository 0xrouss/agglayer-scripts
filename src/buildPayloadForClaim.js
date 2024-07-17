import { decodeAbiParameters } from "viem";
import publicClients from "./getPublicClients";

import PolygonZkEVMBridgeABI from "../ABIs/PolygonZkEVMBridge";

const _PROOF_API =
    "https://api-gateway.polygon.technology/api/v3/merkle-proof/testnet?";
const _GLOBAL_INDEX_MAINNET_FLAG = BigInt(2 ** 64);

async function getBridgeLogData(transactionHash, networkId) {
    const receipt = await publicClients[networkId].getTransactionReceipt({
        hash: transactionHash,
    });
    const logs = receipt.logs.filter(
        (log) =>
            log.topics[0].toLowerCase() ===
            "0x501781209a1f8899323b96b4ef08b168df93e0a90c673d1e4cce39366cb62f9b"
    );
    if (!logs.length) {
        throw new Error("Log not found in receipt");
    }
    const data = logs[0].data;
    return await decodedBridgeData(data);
}

function decodedBridgeData(data) {
    const abi = PolygonZkEVMBridgeABI;
    const types = abi.filter((event) => event.name === "BridgeEvent");

    if (!types.length) {
        throw new Error("Data not decoded");
    }

    const decodedData = decodeAbiParameters(types[0].inputs, data);
    const [
        leafType,
        originNetwork,
        originTokenAddress,
        destinationNetwork,
        destinationAddress,
        amount,
        metadata,
        depositCount,
    ] = decodedData;

    const result = {
        leafType,
        originNetwork,
        originTokenAddress,
        destinationNetwork,
        destinationAddress,
        amount,
        metadata: metadata || "0x",
        depositCount,
    };

    return Promise.resolve(result);
}

async function getProof(networkId, depositCount) {
    try {
        const proof = await getMerkleProof(networkId, depositCount);
        return proof;
    } catch (_) {
        throw new Error("Error in creating proof");
    }
}

async function getMerkleProof(networkId, depositCount) {
    const url =
        _PROOF_API + `networkId=${networkId}&depositCount=${depositCount}`;

    console.log(url);

    try {
        const response = await fetch(url);

        if (response.ok) {
            const blob = await response.blob();
            const text = await blob.text();
            const json = JSON.parse(text);

            return json.proof;
        } else {
            console.error("HTTP error", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Fetch error", error);
    }
}

function computeGlobalIndex(indexLocal, sourceNetworkId) {
    if (BigInt(sourceNetworkId) === BigInt(0)) {
        return BigInt(indexLocal) + _GLOBAL_INDEX_MAINNET_FLAG;
    } else {
        return (
            BigInt(indexLocal) + BigInt(sourceNetworkId - 1) * BigInt(2 ** 32)
        );
    }
}

export async function buildPayloadForClaim(transactionHash, networkId) {
    const data = await getBridgeLogData(transactionHash, networkId);
    const {
        originNetwork,
        originTokenAddress,
        destinationNetwork,
        destinationAddress,
        amount,
        metadata,
        depositCount,
    } = data;
    const proof = await getProof(networkId, depositCount);
    const payload = {
        smtProof: proof.merkle_proof,
        smtProofRollup: proof.rollup_merkle_proof,
        globalIndex: computeGlobalIndex(depositCount, networkId).toString(),
        mainnetExitRoot: proof.main_exit_root,
        rollupExitRoot: proof.rollup_exit_root,
        originNetwork: originNetwork,
        originTokenAddress: originTokenAddress,
        destinationNetwork: destinationNetwork,
        destinationAddress: destinationAddress,
        amount: amount,
        metadata: metadata,
    };
    return payload;
}
