import { createFileRoute } from '@tanstack/react-router'
import { ApexOptions } from 'apexcharts'
import React, { useState, useEffect } from 'react'
import ReactApexChart from 'react-apexcharts'

import StudyLayout from '@/components/study-layout'


// Định nghĩa route
export const Route = createFileRoute('/_private/system-monitoring/')({
  beforeLoad: async () => {
    document.title = 'System Monitoring - Code Pulse';
    if (!localStorage.getItem('userStore')) {
      window.location.assign('/login');
    };
    const rawUserStore = localStorage.getItem('userStore');
    const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
    const State = userStore?.state ?? null;
    const userLocalStore = State.user ?? null;
    if (!userLocalStore || !userLocalStore.isCoordinator) {
      window.location.assign('/dashboard');
    }
  },
  component: RouteComponent,
})

// Giới hạn số điểm dữ liệu trên biểu đồ
const MAX_DATA_POINTS = 30

// ---------- COMPONENT CON: GAUGE (Như cũ) ----------
interface GaugeChartProps {
  title: string
  series: number
}

const GaugeChart: React.FC<GaugeChartProps> = ({ title, series }) => {
  const options: ApexOptions = {
    chart: { type: 'radialBar', height: 180, offsetY: -10, sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { margin: 15, size: '60%', background: 'transparent' },
        track: { background: '#424242', strokeWidth: '100%' },
        dataLabels: {
          name: { show: true, fontSize: '15px', fontWeight: 600, color: '#8BC34A', offsetY: -10 },
          value: { show: true, fontSize: '16px', color: '#6c757d', offsetY: 10, formatter: (val) => val.toFixed(0) + '%' },
        },
      },
    },
    fill: { colors: ['#8BC34A'] },
    stroke: { lineCap: 'round' },
    labels: [title],
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-4 shadow">
      <ReactApexChart options={options} series={[series]} type="radialBar" height={180} />
    </div>
  )
}

// ---------- COMPONENT CON MỚI: AREA CHART ----------
interface AreaChartProps {
  title: string
  series: ApexAxisChartSeries
  categories: string[] // Mảng các nhãn thời gian
  yaxisLabel?: string
  yMax?: number
}

const AreaChart: React.FC<AreaChartProps> = ({ title, series, categories, yaxisLabel, yMax }) => {
  const options: ApexOptions = {
    chart: {
      type: 'area',
      height: 300,
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        dynamicAnimation: {
          speed: 1000,
        },
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    xaxis: {
      type: 'category',
      categories: categories,
      tickAmount: 6, // Hiển thị ít nhãn thời gian hơn
      labels: {
        formatter: (value: string) => value ? value.split(' ')[0] : '', // Chỉ hiện HH:mm:ss
      }
    },
    yaxis: {
      max: yMax || 100, // 100% cho CPU
      min: 0,
      labels: {
        formatter: (val) => val.toFixed(0) + (yaxisLabel || '%'),
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'left',
      offsetY: 0,
    },
    colors: ['#008FFB', '#00E396'], // Xanh dương & Xanh lá
    tooltip: {
      y: {
        formatter: (val) => val.toFixed(1) + (yaxisLabel || '%'),
      },
    },
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">{title}</h3>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={300}
      />
    </div>
  )
}

// ---------- INTERFACE DỮ LIỆU (ĐÃ MỞ RỘNG) ----------
interface SystemStats {
  // Cho Gauges
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  swapUsage: number

  // Cho Area Charts
  cpuDetail: {
    user: number
    system: number
  }
  memDetail: {
    totalGB: number
    usedGB: number
  }
}

// Hàm helper tạo mảng rỗng ban đầu
const createInitialData = (length: number) => Array(length).fill(0);
const createInitialLabels = (length: number) => Array(length).fill('');

// ===== THAY ĐỔI 1: Thêm type này =====
// Định nghĩa type rõ ràng cho state của biểu đồ
type ChartDataSeries = {
  name: string;
  data: number[];
}

// ---------- COMPONENT CHÍNH CỦA ROUTE (ĐÃ CẬP NHẬT) ----------
function RouteComponent() {
  // State cho Gauges
  const [stats, setStats] = useState<SystemStats | null>(null)

  // State cho Area Charts
  const [timeLabels, setTimeLabels] = useState<string[]>(createInitialLabels(MAX_DATA_POINTS))

  // ===== THAY ĐỔI 2: Dùng type 'ChartDataSeries[]' thay vì 'ApexAxisChartSeries' =====
  const [cpuSeries, setCpuSeries] = useState<ChartDataSeries[]>([
    { name: 'Busy User', data: createInitialData(MAX_DATA_POINTS) },
    { name: 'Busy IQRs', data: createInitialData(MAX_DATA_POINTS) }, // (Dùng system)
  ])
  // ===== THAY ĐỔI 3: Dùng type 'ChartDataSeries[]' thay vì 'ApexAxisChartSeries' =====
  const [memSeries, setMemSeries] = useState<ChartDataSeries[]>([
    { name: 'Total', data: createInitialData(MAX_DATA_POINTS) },
    { name: 'Used', data: createInitialData(MAX_DATA_POINTS) },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/stats')
        if (!response.ok) throw new Error('Không kết nối được server Python')
        const data: SystemStats = await response.json()

        // Cập nhật Gauges
        setStats(data)

        // Lấy thời gian hiện tại
        const newTime = new Date().toLocaleTimeString('vi-VN')

        // Cập nhật state cho Area Charts
        setTimeLabels((prev) => [...prev.slice(1), newTime]) // Thêm mới, bỏ cũ

        // Dòng 181 của bạn giờ sẽ hoạt động
        setCpuSeries((prev) => [ // Giờ 'prev' được TypeScript hiểu là 'ChartDataSeries[]'
          { name: 'Busy User', data: [...prev[0].data.slice(1), data.cpuDetail.user] },
          { name: 'Busy IQRs', data: [...prev[1].data.slice(1), data.cpuDetail.system] },
        ])

        setMemSeries((prev) => [ // Tương tự
          { name: 'Total', data: [...prev[0].data.slice(1), data.memDetail.totalGB] },
          { name: 'Used', data: [...prev[1].data.slice(1), data.memDetail.usedGB] },
        ])

      } catch (error) {
        console.error('Lỗi khi lấy thông số hệ thống:', error)
      }
    }

    // Cập nhật mỗi 2 giây
    const interval = setInterval(fetchStats, 2000)
    return () => clearInterval(interval)
  }, []) // Chỉ chạy 1 lần lúc mount

  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-100 p-6">
        {/* Hàng Gauges */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <GaugeChart title="CPU Usage" series={stats?.cpuUsage || 0} />
          <GaugeChart title="Memory Usage" series={stats?.memoryUsage || 0} />
          <GaugeChart title="Disk Usage" series={stats?.diskUsage || 0} />
          <GaugeChart title="Swap Usage" series={stats?.swapUsage || 0} />
        </div>

        {/* Hàng Area Charts MỚI */}
        <div className="grid grid-cols-1 gap-6">
          <AreaChart
            title="CPU Basic"
            series={cpuSeries} // Kiểu 'ChartDataSeries[]' vẫn tương thích với 'ApexAxisChartSeries'
            categories={timeLabels}
            yMax={100} // CPU max 100%
            yaxisLabel="%"
          />
          <AreaChart
            title="Memory Basic"
            series={memSeries} // Tương tự
            categories={timeLabels}
            yMax={stats?.memDetail.totalGB ? Math.ceil(stats.memDetail.totalGB / 2) * 2 : 16} // Làm tròn Total GB
            yaxisLabel=" GB"
          />
        </div>
      </div>
    </StudyLayout>
  )
}