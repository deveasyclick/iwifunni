'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Icon } from '@iconify/react'
import * as profileData from './data'
import SimpleBar from 'simplebar-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const Profile = () => {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        setIsLoggingOut(false)
        return
      }

      router.replace('/auth/login')
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className='relative group/menu ps-15 shrink-0'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className='hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary'>
            <Image
              src='/images/profile/user-1.jpg'
              alt='logo'
              height={35}
              width={35}
              className='rounded-full'
            />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='end'
          className='w-screen sm:w-[200px] pb-4 pt-2 rounded-sm'>
          <SimpleBar>
            {profileData.profileDD.map((item, index) => (
              <DropdownMenuItem key={index} asChild>
                <Link
                  href={item.url}
                  className='px-4 py-2 flex justify-between items-center group/link w-full hover:bg-lightprimary hover:text-primary'>
                  <div className='flex items-center gap-3 w-full'>
                    <Icon
                      icon={item.icon}
                      className='text-lg text-muted-foreground group-hover/link:text-primary'
                    />
                    <h5 className='mb-0 text-sm text-muted-foreground group-hover/link:text-primary'>
                      {item.title}
                    </h5>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </SimpleBar>

          <DropdownMenuSeparator className='my-2' />

          <div className='px-4'>
            <Button
              variant='outline'
              className='w-full rounded-md'
              onClick={handleLogout}
              disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default Profile
