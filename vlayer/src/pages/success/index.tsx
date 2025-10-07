import { useSearchParams, useNavigate } from "react-router";
import { shortenAndFormatHash } from "../../shared/lib/utils";
import { useAccount } from "wagmi";
export const SuccessPage = () => {
  const account = useAccount();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txHash = searchParams.get("txHash");
  console.log(account.chain);


  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <>
      <div className="mt-5 flex justify-center text-slate-900">
        <div>
          Check out the txHash:{" "}
          <a
            href={`${account.chain?.blockExplorers?.default.url}/tx/${txHash}`}
            className="text-blue-700 text-center text-block font-bold"
          >
            {shortenAndFormatHash(txHash)}
          </a>
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleBackToHome}
          className="btn w-[220px] px-4 bg-[#915bf8] rounded-lg border-none text-white hover:bg-[#915bf8]/80 hover:text-white"
        >
          Back to Home
        </button>
      </div>
    </>
  );
};
