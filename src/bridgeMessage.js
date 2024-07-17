import { http, createWalletClient } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import publicClients from "./getPublicClients";
import { _TESTNET_BRIDGE_ADDRESS, _LAYER_INDEX } from "./constants";

/**
 *
 * @param {*} originNetwork
 * @param {*} amount
 * @param {*} destinationNetwork
 * @param {*} destinationAddress
 * @param {*} forceUpdateGlobalExitRoot
 * @param {*} metadata
 * @returns Transaction Hash
 */
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
