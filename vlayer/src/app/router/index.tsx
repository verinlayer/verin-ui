import { BrowserRouter, Routes, Route } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryComponent } from "../../shared/errors/ErrorBoundary";
import { Layout } from "../../shared/layout/Layout";
import { getAllSteps } from "./steps";
import WalletConnect from "../../pages/wallet-connect";
import { DashboardPage } from "../../pages/dashboard";
import { LandingPage } from "../../pages/landing";

const Router = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={AppErrorBoundaryComponent}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            {getAllSteps().map((step) => (
              <Route
                key={step.path}
                path={step.path}
                element={<step.component />}
              />
            ))}
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>
          <Route path="/wallet-connect" element={<WalletConnect />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Router;
