"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import Image from "next/image"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  src,
  alt = '',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  // Usa next/image para URLs do DiceBear (otimizacao e cache de imagem)
  if (src && typeof src === 'string' && src.includes('dicebear.com')) {
    return (
      <Image
        src={src}
        alt={alt || 'Avatar'}
        width={80}
        height={80}
        className={cn("aspect-square size-full rounded-full", className)}
      />
    )
  }
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      src={src}
      alt={alt}
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
