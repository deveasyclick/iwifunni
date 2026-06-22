import Image from 'next/image';

interface ProfileWelcomeProps {
  readonly firstName?: string;
  readonly isLoading?: boolean;
}

function greetingContent(isLoading: boolean | undefined, displayName: string) {
  if (isLoading) return 'Loading...';
  return <>Welcome back! {displayName} 👋</>;
}

const ProfileWelcome = ({ firstName, isLoading }: ProfileWelcomeProps) => {
  const displayName = firstName || 'there';

  return (
    <div className="relative flex items-center justify-between bg-lightsecondary rounded-lg p-6">
      <div className="flex items-center gap-3">
        <div>
          <Image
            src={'/images/profile/user-1.jpg'}
            alt="user-img"
            width={50}
            height={50}
            className="rounded-full"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <h5 className="card-title">
            {greetingContent(isLoading, displayName)}
          </h5>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your notifications
          </p>
        </div>
      </div>
      <div className="hidden sm:block absolute right-8 bottom-0">
        <Image
          src={'/images/dashboard/customer-support-img.png'}
          alt="support-img"
          width={145}
          height={95}
        />
      </div>
    </div>
  );
};

export default ProfileWelcome;
