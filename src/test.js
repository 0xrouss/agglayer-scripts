import { encodePacked } from "viem";
import { buildPayloadForClaim } from "./buildPayloadForClaim";
import { isClaimed } from "./isClaimed";
import { privateKeyToAccount } from "viem/accounts";
import { claimAsset } from "./claimAsset";
import { bridgeAsset } from "./bridgeAsset";
import { bridgeMessage } from "./bridgeMessage";
import {
    _CARDONA_DECASH_ADDRESS,
    _SEPOLIA_DECASH_ADDRESS,
    _ZKYOTO_DECASH_ADDRESS,
} from "./constants";

const _SEPOLIA_INDEX = 0;
const _CARDONA_INDEX = 1;
const _ZKYOTO_INDEX = 2;

const AMOUNT = 100000000000000n;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

// Function to encode metadata for bridgeMessage
function encodeMetadata(linkId) {
    // Encode the linkId as a single uint256 value
    return encodePacked(["uint256"], [linkId]);
}

console.log(
    await bridgeAsset(
        0,
        1,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);
console.log(
    await bridgeAsset(
        0,
        2,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);
console.log(
    await bridgeAsset(
        1,
        0,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);
console.log(
    await bridgeAsset(
        1,
        2,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);
console.log(
    await bridgeAsset(
        2,
        0,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);
console.log(
    await bridgeAsset(
        2,
        1,
        account.address,
        AMOUNT,
        ZERO_ADDRESS,
        true,
        "",
        account
    )
);

console.log(await isClaimed(28473, _SEPOLIA_INDEX, _CARDONA_INDEX));
console.log(await isClaimed(28474, _SEPOLIA_INDEX, _ZKYOTO_INDEX));
console.log(await isClaimed(8270, _CARDONA_INDEX, _SEPOLIA_INDEX));
console.log(await isClaimed(8271, _CARDONA_INDEX, _ZKYOTO_INDEX));

const data = await buildPayloadForClaim(
    "0x9c2e00624d7d60bcdd8124639bd8369e68062b00081b512b2f6c930a5b282c50",
    _SEPOLIA_INDEX
);

console.log(data);

if (!(await isClaimed(28473, _SEPOLIA_INDEX, _CARDONA_INDEX))) {
    const data = await buildPayloadForClaim(
        "0x223671c126e6270e8c24eee62a9431f4efa8bc077a0d9a2396b6714ecc6c2167",
        _SEPOLIA_INDEX
    );

    const tx = await claimAsset(data, account);
    console.log(tx);
}
if (!(await isClaimed(28474, _SEPOLIA_INDEX, _ZKYOTO_INDEX))) {
}
if (!(await isClaimed(8270, _CARDONA_INDEX, _SEPOLIA_INDEX))) {
    const data = await buildPayloadForClaim(
        "0x650076d1cdd4cec312d10559bddc4973a89d7675f9e60adf85d2677cd490cf58",
        _CARDONA_INDEX
    );

    const tx = await claimAsset(data, account);
    console.log(tx);
}
if (!(await isClaimed(8271, _CARDONA_INDEX, _ZKYOTO_INDEX))) {
    const data = await buildPayloadForClaim(
        "0xda2dc6a3b7c29beb6857667ec4e7a102e154ee16276d5e8fbf0575fc32a475ef",
        _CARDONA_INDEX
    );

    const tx = await claimAsset(data, account);
    console.log(tx);
}
if (!(await isClaimed(745, _ZKYOTO_INDEX, _SEPOLIA_INDEX))) {
    const data = await buildPayloadForClaim(
        "0x73feecdaafa9c3a236a500479ea41fefa957a3a5da823d3f2582fc567af033c4",
        _ZKYOTO_INDEX
    );

    const tx = await claimAsset(data, account);
    console.log(tx);
}
if (!(await isClaimed(746, _ZKYOTO_INDEX, _CARDONA_INDEX))) {
    const data = await buildPayloadForClaim(
        "0x6ab7ed9fdc37af442d5beed693d89181bd1bbf649062dee51d25e574419dcbca",
        _ZKYOTO_INDEX
    );

    const tx = await claimAsset(data, account);
    console.log(tx);
}

console.log(
    await bridgeMessage(
        _SEPOLIA_INDEX,
        AMOUNT,
        _CARDONA_INDEX,
        _CARDONA_DECASH_ADDRESS,
        true,
        encodeMetadata(1),
        account
    )
);

console.log(
    await bridgeMessage(
        _SEPOLIA_INDEX,
        AMOUNT,
        _ZKYOTO_INDEX,
        _ZKYOTO_DECASH_ADDRESS,
        true,
        encodeMetadata(1),
        account
    )
);

console.log(data);

const tx = await claimAsset(data, account);

console.log(tx);
