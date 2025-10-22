import CodeBlock from "./CodeBlock";

export default function BotTrading() {

    const pythonSnippet = `def greet(name):
    print(f"Hello, {name}!")

if __name__ == "__main__":
    greet("Bruce")`;
    return <div className='flex-shrink-0 bg-[#000000]/50 h-min py-7 px-6 rounded-4xl gap-5 flex flex-col items-center border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]'>
        <h1 className="text-2xl">Bot Trading</h1>
        <div className="flex">
            <div>
                <h2 className="text-xl mb-4">Instructions</h2>
                <ol className="list-decimal ml-7 pr-2">
                    <li>Head Over to Agentverse</li>
                    <li>Create a new Agent using the Blank Template</li>
                    <li>Head over to the build tab and copy paste the given code.</li>
                    <li>Edit the function “execute_transaction” to add your code.</li>
                    <li>Input Format:</li>
                    <li>Output Format:</li>
                </ol>
            </div>
            
            <CodeBlock code={pythonSnippet}/>

        </div>
    </div>
}