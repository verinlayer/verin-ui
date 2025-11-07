import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { ErrorBoundary } from "react-error-boundary";
import { StepErrorBoundaryComponent } from "../../errors/ErrorBoundary";
import { useCurrentStep } from "../../hooks/useCurrentStep";
import { Navigation } from "../Navigation";
import { Footer } from "../Footer";
import { motionConfig } from "./Modal.animations";
import { useAccount } from "wagmi";

export const modalContext = createContext({
  showModal: () => {},
  closeModal: () => {},
});

export const Modal = ({ children }: { children: React.ReactNode }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  const showModal = useCallback(() => {
    modalRef.current?.showModal();
  }, [modalRef]);

  const closeModal = useCallback(() => {
    modalRef.current?.close();
  }, [modalRef]);

  useEffect(() => {
    showModal();
  }, [showModal]);
  const { currentStep } = useCurrentStep();
  const { isConnected } = useAccount();

  const [descClass, setDescClass] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescClass("out");

    setTimeout(() => {
      setDescClass("in");
      setDescription(currentStep?.description || "");
    }, 300);
  }, [currentStep?.description]);

  return (
    <dialog className="modal" ref={modalRef}>
      <div className="modal-box max-w-none w-[95vw] h-[95vh]">
        <motion.div
          className="flex flex-col items-center justify-between min-h-full"
          {...motionConfig}
        >
          <div className="w-full flex-shrink-0">
            <Navigation />
          </div>
          <div className={`${isConnected ? 'pt-10' : 'pt-4'} w-full flex flex-col items-center flex-1 overflow-y-auto min-h-0`}>
            <ErrorBoundary FallbackComponent={StepErrorBoundaryComponent}>
            <div className="w-full max-w-full flex flex-col items-center px-2 sm:px-4 flex-1">
              <AnimatePresence>
                {currentStep?.headerIcon && (
                  <motion.img
                    src={currentStep?.headerIcon}
                    alt="Success Icon"
                    className="w-[400px] h-[200px] mx-auto max-w-full"
                    {...motionConfig}
                  />
                )}
              </AnimatePresence>
              <div className="flex-col flex gap-4 justify-between mb-2 w-full max-w-full flex-1">
                {currentStep?.title && (
                  <h3 className={`header ${descClass}`}>{currentStep?.title}</h3>
                )}
                {currentStep?.description && (
                  <p className={`h-[116px] desc ${descClass}`}>{description}</p>
                )}
                <modalContext.Provider value={{ showModal, closeModal }}>
                  <div className="w-full max-w-full flex justify-center flex-1">
                    {children}
                  </div>
                </modalContext.Provider>
              </div>
            </div>
            </ErrorBoundary>
          </div>
          <div className="w-full flex-shrink-0">
            <Footer />
          </div>
        </motion.div>
      </div>
    </dialog>
  );
};
