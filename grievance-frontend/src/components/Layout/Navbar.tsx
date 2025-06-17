import React from 'react'
import Image from 'next/image'
import { CircleUserRound } from 'lucide-react';

interface NavbarProps {
  className?: string;
}

const Navbar = ({ className = '' }: NavbarProps) => {
  return (
    <div className={`w-full bg-white border-b border-blue-100 p-2 flex justify-between items-center ${className}`}>
      <Image src="https://dseu.ac.in/assets/DSEULOGOTHICK-Bm0-gkb8.svg" width={40} height={40} alt="logo" className='cursor-pointer ml-2'/>
      <div className='flex items-center gap-2'>
        <CircleUserRound className='w-6 h-6 text-blue-600' />
        <span className='font-medium'>Student</span>
      </div>
    </div>
  )
}

export default Navbar
