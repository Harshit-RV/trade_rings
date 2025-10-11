import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode,
  onClick: () => void,
  disabled?: boolean,
  className?: string
}

const Button = ( props: ButtonProps ) => {
  return (
    <button 
      onClick={props.onClick} 
      disabled={props.disabled}
      className={props.className || "border bg-black hover:bg-black/80 hover:cursor-pointer h-10 w-min text-nowrap px-3 rounded-lg flex justify-center items-center text-white disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      {props.children}
    </button>
  )
}

export default Button;