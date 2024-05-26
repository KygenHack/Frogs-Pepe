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
  const [quantity, setQuantity] = useState(150000);
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
      return "Checking Status";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(activeClaimCondition.data?.currencyMetadata.value || 0);
      if (pricePerToken.eq(0)) {
        return "Claim (Free)";
      }
      return `Claim (${priceToMint})`;
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
                    <p className="text-center text-black">To start incubating Frogs Pepe Rewards, simply connect your wallet, which stores your Frogs Pepe Drops.</p>
                    <br />
                    <p className="text-center mt-4 mb-4 text-black">Please connect your wallet</p>
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
                  <h1 className="text-center header-text text-black">Hop into Frogs Pepe: <br/>Your Portal to Epic Airdrops and Ribbiting Incubation</h1>
                  <p className="text-black text-center header-desc mt-2 mb-2">Frogs Pepe is here to power your meme crypto adventure with a blend of epic airdrops and incubatior. </p>
                 
                  <div className="stat">
                        <div className="stat-title text-black text-center">Total Claimed Balance</div>
                        <div className="stat-value">
                          {!loadingToken && !loadingTokenBalance && tokenBalance?.value !== undefined ? (
                            <>
                              <h4 className="stat-value text-center text-sm text-black">
                                {`${parseFloat(ethers.utils.formatEther(tokenBalance.value)).toLocaleString()} ${tokenBalance.symbol}`} ~ 
                                {usdPrice !== null && (
                                 <span>{`${usdPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} USDT </span>
                              )}
                              </h4>
                            </>
                          ) : (
                            <div className="skeleton-loader">
                              <div className="stat-value text-center text-black">Loading...</div>
                            </div>
                          )}
                        </div>
                        </div>
                    
                    <section className="">
                      <div className="stat text-black">
                        {(claimConditions.data &&
                          claimConditions.data.length > 0 &&
                          activeClaimCondition.isError) ||
                         (activeClaimCondition.data &&
                         activeClaimCondition.data.startTime > new Date() && (
                             <p className="text-black text-center">Drop is starting soon. Please check back later.</p>
                          ))}

                          {claimConditions.data?.length === 0 ||
                          (claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0") && (
                               <p className="text-black text-center">
                             This drop is not ready to be minted yet. (No claim condition set)
                             </p>
                              ))}
                      {isLoading ? (
                   <p className="text-center">Loading Please Wait...</p>
                   ) : (
                     <>
          {contractMetadata?.image && (
            <center><img
              src={contractMetadata?.image}
              alt={contractMetadata?.name!}
              width={200}
              height={200}
            />
            </center>
          )}

          <h1 className="text-center header-text">Claim The {contractMetadata?.name}</h1>
          <p className="text-center">
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
                          disabled
                        />

                        <Web3Button
                          theme="dark"
                          contractAddress={tokendropcontract}
                          action={(contract) => contract.erc20.claim(quantity)}
                          onSuccess={() => alert("Claimed!")}
                          onError={(err) => alert(err)}
                          style={{ color: "white", background:"green" }}
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
