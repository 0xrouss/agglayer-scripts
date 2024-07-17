# Unified Bridge zkEVM Extension

This document demonstrates inter-layer bridging using the Agreggation Layer LxLy bridge. As an example, we go over how to bridge Ether from Ethereum Sepolia to Polygon ZkEVM Cardona using the Viem library.

All scripts are available in the repository of this project.

## How to bridge an asset

The `bridgeAsset` contract function receives six parameters to be able to communicate well to the AggLayer our destination network, destination address and the value we are sending:

-   **destinationNetwork**: The destination layer we are sending the Ether
-   **destinationAddress**: The destination addres we are sending the Ether
-   **amount**: The amount of Ether we are sending
-   **token**: The token address of the token we are sending, in this case is the zero address because we are bridging Ether and is the native token
-   **forceUpdateGlobalExitRoot**: Always true to update the aggregator proof generator
-   **permitData**: The token permit data, an empty string because we are sending the native token

It also needs an amount to be send as value in the transaction.

```javascript
import { http, createWalletClient } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import publicClients from "./getPublicClients";
import { _TESTNET_BRIDGE_ADDRESS, _LAYER_INDEX } from "./constants";

export async function bridgeAsset(
    originNetwork,
    destinationNetwork,
    destinationAddress,
    amount,
    token,
    forceUpdateGlobalExitRoot,
    permitData,
    account
) {
    const { request } = await publicClients[originNetwork].simulateContract({
        address: _TESTNET_BRIDGE_ADDRESS,
        abi: PolygonZkEVMBridge,
        functionName: "bridgeAsset",
        args: [
            destinationNetwork,
            destinationAddress,
            amount,
            token,
            forceUpdateGlobalExitRoot,
            permitData,
        ],
        account,
        value: amount,
    });

    const client = createWalletClient({
        account: account,
        chain: _LAYER_INDEX[originNetwork],
        transport: http(),
    });

    return await client.writeContract(request);
}
```

This script demonstrates how to simulate and execute the method in the origin network, this function returns the transaction hash.

## Build Payload for Claim

After bridging we need to obtain the payload to execute the claim on the destination network.

First we get the transaction logs to obtain the deposit number in the origin network and call the AggLayer API that will return the proofs need to make the claim.

The aggregation layer bridge API currently takes at least 15 minutes to synchronize the layers and generate the proofs in Testnet.

The `buildPayloadForClaim` script only needs the hash and the origin network index id

```javascript
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
```

This function will return all the data we need to perform the claim.

## How to claim an asset

The `claimAsset` contract function receives eleven parameters to be able to claim our Ether bridge:

-   **smtProofLocalExitRoot**: Local exit root proof obtained from the API
-   **smtProofRollupExitRoot**: Rollup exit root proof obtained from the API
-   **globalIndex**: Global index calculated in the `buildPayloadForClaim`
-   **mainnetExitRoot**: Mainnet exit root obtained from the API
-   **rollupExitRoot**: Rollup exit root obtained from the API
-   **originNetwork**: The origin network we started the bridge
-   **originTokenAddress**: The token address we are bridging, in this example is the zero address because we are sending the native token
-   **destinationNetwork**: The destination network receiving the bridge
-   **destinationAddress**: The destination address receiving the Ether, in this example we are sending to the same address that executes it.
-   **amount**: The amount of tokens we are bridging
-   **metadata**: Extra information needed, in this case is the permitData being an empty string

```javascript
import { createWalletClient, http } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import publicClients from "./getPublicClients";
import { _TESTNET_BRIDGE_ADDRESS, _LAYER_INDEX } from "./constants";

export async function claimAsset(data, account) {
    const smtProofLocalExitRoot = data.smtProof;
    const smtProofRollupExitRoot = data.smtProofRollup;
    const globalIndex = data.globalIndex;
    const mainnetExitRoot = data.mainnetExitRoot;
    const rollupExitRoot = data.rollupExitRoot;
    const originNetwork = data.originNetwork;
    const originTokenAddress = data.originTokenAddress;
    const destinationNetwork = data.destinationNetwork;
    const destinationAddress = data.destinationAddress;
    const amount = data.amount;
    const metadata = data.metadata;

    const { request } = await publicClients[
        destinationNetwork
    ].simulateContract({
        address: _TESTNET_BRIDGE_ADDRESS,
        abi: PolygonZkEVMBridge,
        functionName: "claimAsset",
        args: [
            smtProofLocalExitRoot,
            smtProofRollupExitRoot,
            globalIndex,
            mainnetExitRoot,
            rollupExitRoot,
            originNetwork,
            originTokenAddress,
            destinationNetwork,
            destinationAddress,
            amount,
            metadata,
        ],
        account,
    });

    const client = createWalletClient({
        account: account,
        chain: _LAYER_INDEX[destinationNetwork],
        transport: http(),
    });

    return await client.writeContract(request);
}
```

This script function will return the transaction hash used to claim the bridge.

## How to bridge a message

Agregation Layer Bridge allows to send messages to interact with contracts on other blockchains, these contracts will have to have the following interface implemented to be able to handle these crosschain requests

```solidity
function onMessageReceived(
                address originAddress,
                uint32 originNetwork,
                bytes memory data
) external payable {}
```

Before calling the script to launch the crosschain message we need to encode the metadata that the target contract will receive, in this case we are encoding a linkId that the target contract needs

```javascript
import { encodePacked } from "viem";
// Function to encode metadata for bridgeMessage
function encodeMetadata(linkId) {
    // Encode the linkId as a single uint256 value
    return encodePacked(["uint256"], [linkId]);
}
```

To send a message is similar to send tokens, but we change the address of the token contract for the contract we are calling and we do not send the amount, since it sends what it receives by value.

```javascript
import { http, createWalletClient } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import publicClients from "./getPublicClients";
import { _TESTNET_BRIDGE_ADDRESS, _LAYER_INDEX } from "./constants";

export async function bridgeMessage(
    originNetwork,
    amount,
    destinationNetwork,
    destinationAddress,
    forceUpdateGlobalExitRoot,
    metadata,
    account
) {
    const { request } = await publicClients[originNetwork].simulateContract({
        address: _TESTNET_BRIDGE_ADDRESS,
        abi: PolygonZkEVMBridge,
        functionName: "bridgeMessage",
        args: [
            destinationNetwork,
            destinationAddress,
            forceUpdateGlobalExitRoot,
            metadata,
        ],
        account,
        value: amount,
    });

    const client = createWalletClient({
        account: account,
        chain: _LAYER_INDEX[originNetwork],
        transport: http(),
    });

    return await client.writeContract(request);
}
```

## How to claim a message

To claim a message we have to do the same as for claiming an asset

```javascript
import { createWalletClient, http } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import publicClients from "./getPublicClients";
import { _LAYER_INDEX, _TESTNET_BRIDGE_ADDRESS } from "./constants";

export async function claimMessage(data, account) {
    const smtProofLocalExitRoot = data.smtProof;
    const smtProofRollupExitRoot = data.smtProofRollup;
    const globalIndex = data.globalIndex;
    const mainnetExitRoot = data.mainnetExitRoot;
    const rollupExitRoot = data.rollupExitRoot;
    const originNetwork = data.originNetwork;
    const originAddress = data.originTokenAddress;
    const destinationNetwork = data.destinationNetwork;
    const destinationAddress = data.destinationAddress;
    const amount = data.amount;
    const metadata = data.metadata;

    const { request } = await publicClients[
        destinationNetwork
    ].simulateContract({
        address: _TESTNET_BRIDGE_ADDRESS,
        abi: PolygonZkEVMBridge,
        functionName: "claimMessage",
        args: [
            smtProofLocalExitRoot,
            smtProofRollupExitRoot,
            globalIndex,
            mainnetExitRoot,
            rollupExitRoot,
            originNetwork,
            originAddress,
            destinationNetwork,
            destinationAddress,
            amount,
            metadata,
        ],
        account,
    });

    const client = createWalletClient({
        account: account,
        chain: _LAYER_INDEX[destinationNetwork],
        transport: http(),
    });

    return await client.writeContract(request);
}
```
