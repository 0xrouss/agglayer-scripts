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
