import { lazy, Suspense } from "react";

const ConfirmModal = lazy(() => import("./components/modals/ConfirmModal.tsx"));
const SubModeModal = lazy(() => import("./components/modals/SubModeModal.tsx"));
const ResultModal = lazy(() => import("./components/modals/ResultModal.tsx"));

function Modals() {
  return (
    <Suspense>
      <ConfirmModal />
      <SubModeModal />
      <ResultModal />
    </Suspense>
  );
}

export default Modals;
