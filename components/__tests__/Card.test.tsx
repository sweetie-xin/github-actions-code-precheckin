import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// 模拟的Card组件
interface CardProps {
  title: string
  content: string
  imageUrl?: string
  onClick?: () => void
  variant?: 'default' | 'elevated' | 'outlined'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  actions?: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({
  title,
  content,
  imageUrl,
  onClick,
  variant = 'default',
  size = 'medium',
  loading = false,
  actions,
  className = '',
}) => {
  const baseClasses = 'rounded-lg border transition-all duration-200'
  const variantClasses = {
    default: 'bg-white border-gray-200 hover:border-gray-300',
    elevated: 'bg-white border-gray-200 shadow-md hover:shadow-lg',
    outlined: 'bg-transparent border-2 border-gray-300 hover:border-gray-400',
  }
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ')

  const handleClick = () => {
    if (onClick && !loading) {
      onClick()
    }
  }

  if (loading) {
    return (
      <div className={classes} data-testid="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={classes} 
      data-testid="card"
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {imageUrl && (
        <div className="mb-3">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-32 object-cover rounded"
            data-testid="card-image"
          />
        </div>
      )}
      
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 mb-1" data-testid="card-title">
          {title}
        </h3>
        <p className="text-gray-600 text-sm" data-testid="card-content">
          {content}
        </p>
      </div>
      
      {actions && (
        <div className="flex gap-2" data-testid="card-actions">
          {actions}
        </div>
      )}
    </div>
  )
}

describe('Card Component', () => {
  const defaultProps = {
    title: 'Test Card',
    content: 'This is a test card content',
  }

  beforeEach(() => {
    // 清理所有模拟
    jest.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应该渲染基本的卡片内容', () => {
      render(<Card {...defaultProps} />)
      
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Card')
      expect(screen.getByTestId('card-content')).toHaveTextContent('This is a test card content')
    })

    it('应该应用默认样式类', () => {
      render(<Card {...defaultProps} />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('border-gray-200')
      expect(card).toHaveClass('p-4')
    })

    it('应该渲染图片当提供imageUrl时', () => {
      render(<Card {...defaultProps} imageUrl="/test-image.jpg" />)
      
      const image = screen.getByTestId('card-image')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', '/test-image.jpg')
      expect(image).toHaveAttribute('alt', 'Test Card')
    })
  })

  describe('变体样式', () => {
    it('应该应用elevated变体样式', () => {
      render(<Card {...defaultProps} variant="elevated" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('shadow-md')
      expect(card).toHaveClass('hover:shadow-lg')
    })

    it('应该应用outlined变体样式', () => {
      render(<Card {...defaultProps} variant="outlined" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-transparent')
      expect(card).toHaveClass('border-2')
      expect(card).toHaveClass('border-gray-300')
    })
  })

  describe('尺寸', () => {
    it('应该应用small尺寸样式', () => {
      render(<Card {...defaultProps} size="small" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-3')
    })

    it('应该应用large尺寸样式', () => {
      render(<Card {...defaultProps} size="large" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-6')
    })
  })

  describe('交互功能', () => {
    it('应该调用onClick当点击时', () => {
      const handleClick = jest.fn()
      render(<Card {...defaultProps} onClick={handleClick} />)
      
      const card = screen.getByTestId('card')
      fireEvent.click(card)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('应该不调用onClick当loading时', () => {
      const handleClick = jest.fn()
      render(<Card {...defaultProps} onClick={handleClick} loading={true} />)
      
      const card = screen.getByTestId('card')
      fireEvent.click(card)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('应该设置正确的role和tabIndex当有onClick时', () => {
      const handleClick = jest.fn()
      render(<Card {...defaultProps} onClick={handleClick} />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('应该不设置role和tabIndex当没有onClick时', () => {
      render(<Card {...defaultProps} />)
      
      const card = screen.getByTestId('card')
      expect(card).not.toHaveAttribute('role')
      expect(card).not.toHaveAttribute('tabIndex')
    })
  })

  describe('加载状态', () => {
    it('应该显示加载骨架屏当loading为true时', () => {
      render(<Card {...defaultProps} loading={true} />)
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      
      // 检查骨架屏元素
      const skeletonElements = card.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })

    it('应该不显示内容当loading为true时', () => {
      render(<Card {...defaultProps} loading={true} />)
      
      expect(screen.queryByTestId('card-title')).not.toBeInTheDocument()
      expect(screen.queryByTestId('card-content')).not.toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('应该渲染操作按钮当提供actions时', () => {
      const actions = (
        <>
          <button>Edit</button>
          <button>Delete</button>
        </>
      )
      
      render(<Card {...defaultProps} actions={actions} />)
      
      const actionsContainer = screen.getByTestId('card-actions')
      expect(actionsContainer).toBeInTheDocument()
      expect(actionsContainer).toHaveTextContent('Edit')
      expect(actionsContainer).toHaveTextContent('Delete')
    })

    it('应该不渲染操作按钮当没有提供actions时', () => {
      render(<Card {...defaultProps} />)
      
      expect(screen.queryByTestId('card-actions')).not.toBeInTheDocument()
    })
  })

  describe('自定义样式', () => {
    it('应该应用自定义className', () => {
      render(<Card {...defaultProps} className="custom-card" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-card')
    })

    it('应该合并自定义样式和默认样式', () => {
      render(<Card {...defaultProps} className="custom-card" variant="elevated" />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-card')
      expect(card).toHaveClass('shadow-md')
      expect(card).toHaveClass('bg-white')
    })
  })

  describe('无障碍性', () => {
    it('应该支持键盘导航当有onClick时', () => {
      const handleClick = jest.fn()
      render(<Card {...defaultProps} onClick={handleClick} />)
      
      const card = screen.getByTestId('card')
      
      // 测试Enter键
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      // 测试空格键
      fireEvent.keyDown(card, { key: ' ', code: 'Space' })
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('应该不响应键盘事件当没有onClick时', () => {
      render(<Card {...defaultProps} />)
      
      const card = screen.getByTestId('card')
      expect(card).not.toHaveAttribute('role')
      expect(card).not.toHaveAttribute('tabIndex')
    })
  })

  describe('边界情况', () => {
    it('应该处理空标题和内容', () => {
      render(<Card title="" content="" />)
      
      expect(screen.getByTestId('card-title')).toHaveTextContent('')
      expect(screen.getByTestId('card-content')).toHaveTextContent('')
    })

    it('应该处理很长的标题和内容', () => {
      const longTitle = 'A'.repeat(1000)
      const longContent = 'B'.repeat(1000)
      
      render(<Card title={longTitle} content={longContent} />)
      
      expect(screen.getByTestId('card-title')).toHaveTextContent(longTitle)
      expect(screen.getByTestId('card-content')).toHaveTextContent(longContent)
    })

    it('应该处理特殊字符在标题和内容中', () => {
      const specialTitle = 'Title with <script>alert("xss")</script>'
      const specialContent = 'Content with "quotes" and \'apostrophes\''
      
      render(<Card title={specialTitle} content={specialContent} />)
      
      expect(screen.getByTestId('card-title')).toHaveTextContent(specialTitle)
      expect(screen.getByTestId('card-content')).toHaveTextContent(specialContent)
    })
  })

  describe('快照测试', () => {
    it('应该保持一致的渲染输出', () => {
      const { container } = render(<Card {...defaultProps} />)
      expect(container).toMatchSnapshot()
    })

    it('应该保持一致的加载状态输出', () => {
      const { container } = render(<Card {...defaultProps} loading={true} />)
      expect(container).toMatchSnapshot()
    })

    it('应该保持一致的elevated变体输出', () => {
      const { container } = render(<Card {...defaultProps} variant="elevated" />)
      expect(container).toMatchSnapshot()
    })
  })
})


