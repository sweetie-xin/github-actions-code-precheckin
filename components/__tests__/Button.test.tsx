import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, jest } from '@jest/globals'

// Mock Button component
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  type = 'button',
  className = '',
}) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ].join(' ')

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  )
}

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toBeDisabled()
  })

  it('renders with custom variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveClass('bg-gray-200')
    expect(button).toHaveClass('text-gray-800')
  })

  it('renders with custom size', () => {
    render(<Button size="large">Large Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveClass('px-6')
    expect(button).toHaveClass('py-3')
    expect(button).toHaveClass('text-lg')
  })

  it('renders disabled state', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveClass('cursor-not-allowed')
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByTestId('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>)
    
    const button = screen.getByTestId('button')
    fireEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders with custom type', () => {
    render(<Button type="submit">Submit Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveClass('custom-class')
  })

  it('renders danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveClass('bg-red-500')
    expect(button).toHaveClass('text-white')
  })

  it('renders small size', () => {
    render(<Button size="small">Small Button</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toHaveClass('px-2')
    expect(button).toHaveClass('py-1')
    expect(button).toHaveClass('text-sm')
  })

  it('renders with children content', () => {
    render(
      <Button>
        <span>Icon</span> Button Text
      </Button>
    )
    
    const button = screen.getByTestId('button')
    expect(button).toHaveTextContent('Icon')
    expect(button).toHaveTextContent('Button Text')
  })
})
