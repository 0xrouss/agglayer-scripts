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
