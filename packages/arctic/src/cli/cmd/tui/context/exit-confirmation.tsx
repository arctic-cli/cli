import { createContext, useContext, type Accessor } from "solid-js"

const ExitConfirmationContext = createContext<Accessor<boolean>>(() => false)

export const ExitConfirmationProvider = (props: { exitConfirmation: Accessor<boolean>; children: any }) => {
  return (
    <ExitConfirmationContext.Provider value={props.exitConfirmation}>{props.children}</ExitConfirmationContext.Provider>
  )
}

export const useExitConfirmation = () => useContext(ExitConfirmationContext)
