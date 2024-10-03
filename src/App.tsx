import { ConnectButton } from "thirdweb/react";
import React, { useState } from 'react';
import { client } from "./client";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useReadContract } from "thirdweb/react";
import { useWalletBalance } from "thirdweb/react";


const EXCHANGE_CONTRACT = "0xD8c5d574f33EeB294a9d03C5D9EaeF78aE4b8007";
const TOKEN_CONTRACT = "0xb2f902825D87efEE4E3eF6873b071F7FA86ca9aB";

export function App() {
	const [account, setAccount] = useState(null);
	const [ethAmount, setEthAmount] = useState("");
	const [tokenAmount, setTokenAmount] = useState("");
	const [loading, setLoading] = useState(false);

	const exchangeContract = getContract({
		client,
		address: EXCHANGE_CONTRACT,
		chain: sepolia,
	});

	const tokenContract = getContract({
		client,
		address: TOKEN_CONTRACT,
		chain: sepolia,
	});

	const { data: exchangeInfo, isLoading: isExchangeInfoLoading } = useReadContract({
		contract: exchangeContract,
		method: "function getExchangeInfo() view returns (uint256, uint256, uint256)",
		params: [],
	});

	const { data: userEthBal, isLoading: isEthBalLoading } = useWalletBalance({
		chain: sepolia,
		// @ts-ignore
		address: account?.address,
		client,
	});


	const { data: userTokenBal, isLoading: isTokenBalLoading } = useWalletBalance({
		chain: sepolia,
		// @ts-ignore
		address: account?.address,
		client,
		tokenAddress: TOKEN_CONTRACT,
	});


	const handleBuyTokens = async () => {
		if (!account || !ethAmount) {
			toast.error("Please connect wallet and enter amount");
			return;
		}


		setLoading(true);
		try {
			const transaction = prepareContractCall({
				contract: exchangeContract,
				method: "function buyTokens()",
				value: BigInt(Number(ethAmount) * 10 ** 18),
			});

			toast.info("Processing purchase...");
			const { transactionHash } = await sendTransaction({
				account,
				transaction,
			});

			await waitForReceipt({
				client,
				chain: sepolia,
				transactionHash,
			});

			toast.success("Tokens purchased successfully!");
		} catch (error) {
			toast.error("Error buying tokens. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleSellTokens = async () => {
		if (!account || !tokenAmount) {
			toast.error("Please connect wallet and enter amount");
			return;
		}

		setLoading(true);
		try {
			// First approve tokens
			const approveTransaction = prepareContractCall({
				contract: tokenContract,
				method: "function approve(address,uint256)",
				params: [EXCHANGE_CONTRACT, BigInt(tokenAmount)],
			});

			toast.info("Approving tokens...");
			await sendTransaction({
				account,
				transaction: approveTransaction,
			});

			// Then sell tokens
			const sellTransaction = prepareContractCall({
				contract: exchangeContract,
				method: "function sellTokens(uint256)",
				params: [BigInt(tokenAmount)],
			});

			toast.info("Processing sale...");
			const { transactionHash } = await sendTransaction({
				account,
				transaction: sellTransaction,
			});

			await waitForReceipt({
				client,
				chain: sepolia,
				transactionHash,
			});

			toast.success("Tokens sold successfully!");
		} catch (error) {
			toast.error("Error selling tokens. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="min-h-screen bg-gray-900 text-white p-8">
			<ToastContainer />

			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-bold text-center mb-8">SubscriptionToken Exchange</h1>

				<div className="flex justify-center mb-8">
					<ConnectButton
						client={client}
						// @ts-ignore
						onConnect={(connectedAccount) => setAccount(connectedAccount?.getAccount() as Account)}
					/>
				</div>

				{account && !isExchangeInfoLoading && exchangeInfo && (
					<div className="bg-gray-800 p-6 rounded-lg mb-8">
						<h2 className="text-xl font-semibold mb-4">Exchange Info</h2>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							<div>
								<p className="text-gray-400">ETH Balance</p>
								<p>{exchangeInfo[0].toString()} ETH</p>
							</div>
							<div>
								<p className="text-gray-400">Token Balance</p>
								<p>{exchangeInfo[1].toString()} Tokens</p>
							</div>
							<div>
								<p className="text-gray-400">Exchange Rate</p>
								<p>{(exchangeInfo[2] / BigInt(1e18)).toString()} Tokens/ETH</p>
							</div>
						</div>
					</div>
				)}

				{account && (
					<div className="grid md:grid-cols-2 gap-8">
						{/* Buy Tokens Section */}
						<div className="bg-gray-800 p-6 rounded-lg">
							<div>
								<h2 className="text-xl font-semibold mb-4">Buy Tokens</h2>
								<p><span className="text-gray-400">ETH Balance</span> {userEthBal?.displayValue} {userEthBal?.symbol}</p>
							</div>
							<input
								type="number"
								placeholder="ETH Amount"
								className="w-full p-2 mb-4 bg-gray-700 rounded"
								value={ethAmount}
								onChange={(e) => setEthAmount(e.target.value)}
							/>
							<button
								onClick={handleBuyTokens}
								disabled={loading}
								className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded"
							>
								{loading ? "Processing..." : "Buy Tokens"}
							</button>
						</div>

						{/* Sell Tokens Section */}
						<div className="bg-gray-800 p-6 rounded-lg">
							<div>
								<h2 className="text-xl font-semibold mb-4">Sell Tokens</h2>
								<p><span className="text-gray-400">Token Balance</span> {userTokenBal?.displayValue} {userTokenBal?.symbol}</p>
							</div>
							<input
								type="number"
								placeholder="Token Amount"
								className="w-full p-2 mb-4 bg-gray-700 rounded"
								value={tokenAmount}
								onChange={(e) => setTokenAmount(e.target.value)}
							/>
							<button
								onClick={handleSellTokens}
								disabled={loading}
								className="w-full bg-green-500 hover:bg-green-600 p-2 rounded"
							>
								{loading ? "Processing..." : "Sell Tokens"}
							</button>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}