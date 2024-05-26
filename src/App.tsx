import "./styles/Home.css";
import NavBar from "./components/NavBar";
import { ContractMetadata, Web3Button, useActiveClaimConditionForWallet, useAddress, useClaimConditions, useClaimIneligibilityReasons, useClaimerProofs, useContractMetadata, useTokenSupply } from "@thirdweb-dev/react";
import { ConnectWallet, darkTheme } from "@thirdweb-dev/react";
import { tokendropcontract } from "./const/contractAddresses";
import { useEffect, useMemo, useState } from "react";
import { useContract, useTokenBalance } from "@thirdweb-dev/react";
import { BigNumber, ethers, utils } from "ethers";
import Footerbox from "./components/Footerbox";
import { parseIneligibility } from "./utils/parseIneligibility";

export default function Home() {
  const address = useAddress();
  const { contract: tokenContract, isLoading: loadingToken } = useContract(tokendropcontract, "token-drop");
  const { data: tokenBalance, isLoading: loadingTokenBalance } = useTokenBalance(tokenContract, address);
  const manualUsdRate = 0.80;
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(15000);
  const { data: contractMetadata } = useContractMetadata(tokenContract);
  const claimedSupply = useTokenSupply(tokenContract);

  const claimConditions = useClaimConditions(tokenContract);
  const activeClaimCondition = useActiveClaimConditionForWallet(tokenContract, address);
  const claimerProofs = useClaimerProofs(tokenContract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(tokenContract, {
    quantity,
    walletAddress: address || "",
  });

  const totalAvailableSupply = useMemo(() => {
    try {
      return BigNumber.from(activeClaimCondition.data?.availableSupply || 0);
    } catch {
      return BigNumber.from(1_000_000_000);
    }
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data?.value || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(BigNumber.from(claimedSupply.data?.value || 0));
    if (n.gte(1_000_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    if (quantity) {
      const bnPrice = BigNumber.from(activeClaimCondition.data?.currencyMetadata.value || 0);
      return `${utils.formatUnits(bnPrice.mul(quantity).toString(), activeClaimCondition.data?.currencyMetadata.decimals || 18)} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
    }
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(activeClaimCondition.data?.maxClaimableSupply || 0);
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(activeClaimCondition.data?.maxClaimablePerWallet || 0);
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000_000)) {
      return 1_000_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(0)) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return activeClaimCondition.isLoading || !tokenContract;
  }, [activeClaimCondition.isLoading, tokenContract]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(activeClaimCondition.data?.currencyMetadata.value || 0);
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  useEffect(() => {
    // Calculate the USD price based on the manual rate
    if (tokenBalance?.value !== undefined) {
      const usdPrice = parseFloat(ethers.utils.formatEther(tokenBalance.value)) * manualUsdRate;
      setUsdPrice(usdPrice);
    }
  }, [tokenBalance, manualUsdRate]);

  if (!address) {
    return (
      <body>
        <NavBar />
        <main className="main">
          <div className="container">
            <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
              <div className="grid">
                <div className="card">
                  <div className="card-text">
                    <img src="https://frogspepe.xyz/images/frogs.png" alt="" width={"104px"}></img>
                    <h1 className="gradient-text-0 text-center mt-4 mb-4">Authenticate Wallet</h1>
                    <p className="text-center">To start mining Frogs Pepe King Rewards, simply connect your wallet, which stores your Frogs Pepe Drops.</p>
                    <br />
                    <p className="text-center mt-4 mb-4">Please connect your wallet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footerbox />
        </main>
      </body>
    );
  }

  return (
    <body>
      <NavBar />
      <main className="main">
        <div className="container">
          <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
            <div className="grid">
              <div className="card">
                <div className="card-text">
                  <div className="header">
                  <h1 className="text-center header-text text-black">Hop into Frogs Pepe: Your Portal to Epic Airdrops and Ribbiting Incubation</h1>
                  <p className="text-black text-center header-desc">Frogs Pepe is here to power your meme crypto adventure with a blend of epic airdrops and incubation services. Uncover new tokens, get early access to quirky projects, and hop ahead with expert guidance in the meme coin universe.</p>
                    <section className="stats stats-vertical col-span-12 bg-white text-black w-full shadow-sm xl:stats-horizontal">
                      <div className="stat">
                        {(claimConditions.data &&
                          claimConditions.data.length > 0 &&
                          activeClaimCondition.isError) ||
                         (activeClaimCondition.data &&
                         activeClaimCondition.data.startTime > new Date() && (
                             <p>Drop is starting soon. Please check back later.</p>
                          ))}

      {claimConditions.data?.length === 0 ||
        (claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0") && (
          <p>
            This drop is not ready to be minted yet. (No claim condition set)
          </p>
        ))}
 {isLoading ? (
        <p>Loading Please Wait...</p>
      ) : (
        <>
          {contractMetadata?.image && (
            <img
              src={contractMetadata?.image}
              alt={contractMetadata?.name!}
              width={200}
              height={200}
            />
          )}

          <h1 className="text-center header-text">Claim The {contractMetadata?.name}</h1>
          <p>
            <span>{contractMetadata?.description}</span>
          </p>
        </>
      )}
                        <input
                          type="number"
                          placeholder="Enter amount to claim"
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > maxClaimable) {
                              setQuantity(maxClaimable);
                            } else if (value < 1) {
                              setQuantity(1);
                            } else {
                              setQuantity(value);
                            }
                          }}
                          value={quantity}
                          className="form-input mt-4 mb-4"
                        />

                        <Web3Button
                          theme="dark"
                          contractAddress={tokendropcontract}
                          action={(contract) => contract.erc20.claim(quantity)}
                          onSuccess={() => alert("Claimed!")}
                          onError={(err) => alert(err)}
                        >
                          {buttonText}
                        </Web3Button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footerbox />
        </div>
      </main>
    </body>
  );
}
