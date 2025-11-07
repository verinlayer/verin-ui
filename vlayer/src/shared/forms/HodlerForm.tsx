import { FormEvent } from "react";

export const HodlerForm = ({
  holderAddress,
  onSubmit,
  isLoading,
  loadingLabel,
  submitLabel,
  isEditable,
  isDisabled = false,
}: {
  holderAddress: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  loadingLabel: string;
  submitLabel: string;
  isEditable: boolean;
  isDisabled?: boolean;
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4 w-full block">
        <input
          name="holderAddress"
          type="hidden"
          defaultValue={holderAddress}
        />
      </div>
      <div className="mt-5 flex justify-center w-full">
        <button
          type="submit"
          id="nextButton"
          disabled={isLoading || isDisabled}
          className="relative z-10"
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};
