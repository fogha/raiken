import Browser from "@/utils/browser"

const Page = () => {
  return (
    <div className="h-full w-full py-4 px-5">
      <div className="rounded-lg w-full h-full mx-auto">
        <Browser
          url="http://127.0.0.1:3000/testpage"
          theme='light'
        >
        </Browser>
      </div>
    </div>
  )
}

export default Page