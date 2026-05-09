import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-10 text-sm text-white/60">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 font-semibold text-white">
            <Image
              src="images/logos/logo-light-204x36.svg"
              alt="logo"
              width={204}
              height={36}
            />
          </div>
          <p className="mt-2">Open-source notification infrastructure.</p>
        </div>

        <div className="flex gap-10">
          <div>
            <p className="text-white mb-2">Product</p>
            <p>Features</p>
            <p>Docs</p>
            <p>Pricing</p>
          </div>

          <div>
            <p className="text-white mb-2">Company</p>
            <p>About</p>
            <p>Contact</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
