'use client';

import Image from 'next/image';

const FullLogo = () => {
  return (
    <>
      {/* Dark Logo */}
      <Image
        src="/images/logos/logo-dark-204x36.svg"
        alt="logo"
        width={204}
        height={36}
        className="block dark:hidden rtl:scale-x-[-1]"
      />
      {/* Light Logo */}
      <Image
        src="/images/logos/logo-light-204x36.svg"
        alt="logo"
        width={204}
        height={36}
        className="hidden dark:block rtl:scale-x-[-1]"
      />
    </>
  );
};

export default FullLogo;
