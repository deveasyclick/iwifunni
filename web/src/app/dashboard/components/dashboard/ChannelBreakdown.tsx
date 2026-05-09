"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import CardBox from "@/app/components/shared/CardBox";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const ChannelBreakdown = () => {
  const series = [45, 30, 15, 10];

  const chartOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
      foreColor: "#AAB4C5",
    },
    labels: ["In-App", "Email", "SMS", "Push"],
    colors: ["#5d87ff", "#13deb9", "#f6b51e", "#8754ec"],

    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: { show: false },

    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              color: "#94A3B8",
              fontSize: "12px",
              formatter: () => "23.4k",
            },
          },
        },
      },
    },

    tooltip: {
      theme: "dark",
      y: {
        formatter: (val) => `${val}%`,
      },
    },
  };

  return (
    <CardBox className="text-white rounded-2xl p-6 h-full">
      <h5 className="text-base font-semibold mb-6">Channel breakdown</h5>

      <div className="flex items-center justify-between gap-6">
        {/* Donut */}
        <div className="relative">
          <Chart
            options={chartOptions}
            series={series}
            type="donut"
            height={220}
          />

          {/* subtle glow */}
          <div className="absolute inset-0 blur-2xl opacity-20 bg-primary rounded-full"></div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4 text-sm w-full max-w-45">
          {[
            { label: "In-App", value: "45% (10.5k)", color: "bg-primary" },
            { label: "Email", value: "30% (7.0k)", color: "bg-success" },
            { label: "SMS", value: "15% (3.5k)", color: "bg-warning" },
            { label: "Push", value: "10% (2.4k)", color: "bg-info" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${item.color}`}
                ></span>
                <span className="text-gray-200">{item.label}</span>
              </div>
              <span className="text-gray-400">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </CardBox>
  );
};

export default ChannelBreakdown;
