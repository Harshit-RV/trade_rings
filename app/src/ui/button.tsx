import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode,
  onClick: () => void
}

const Button = ( props: ButtonProps ) => {
  return (
    <button onClick={props.onClick} className="border bg-black hover:bg-black/80 hover:cursor-pointer h-10 w-min text-nowrap px-3 rounded-lg flex justify-center items-center text-white">
      {props.children}
    </button>
  )
}

export default Button;