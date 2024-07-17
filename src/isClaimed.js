import { createPublicClient, http } from "viem";
import PolygonZkEVMBridge from "../ABIs/PolygonZkEVMBridge";
import { _LAYER_INDEX, _TESTNET_BRIDGE_ADDRESS } from "./constants";

export async function isClaimed(
    depositCount,
    originNetwork,
    destinationNetwork
) {
    const client = createPublicClient({
        chain: _LAYER_INDEX[destinationNetwork],
        transport: http(),
    });

    return await client.readContract({
        address: _TESTNET_BRIDGE_ADDRESS,
        abi: PolygonZkEVMBridge,
        functionName: "isClaimed",
        args: [depositCount, originNetwork],
    });
}
