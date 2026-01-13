
import React from 'react';

const SkeletonBox = ({ className }: { className?: string }) => (
    <div className={`bg-gray-700 rounded-md animate-pulse ${className}`} />
);

const ChannelDetailSkeleton: React.FC = () => {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Back button */}
            <SkeletonBox className="w-40 h-9 mb-4" />
            
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-grow w-full space-y-3 text-center sm:text-left">
                    <SkeletonBox className="h-10 w-3/4 sm:w-1/2 mx-auto sm:mx-0" />
                    <SkeletonBox className="h-4 w-1/2 sm:w-1/3 mx-auto sm:mx-0" />
                    <SkeletonBox className="h-3 w-48 mx-auto sm:mx-0" />
                    <div className="flex items-center justify-center sm:justify-start gap-6 pt-2">
                        <div className="w-32"><SkeletonBox className="h-10 w-full" /></div>
                        <div className="w-32"><SkeletonBox className="h-10 w-full" /></div>
                    </div>
                </div>
            </header>
            
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-700">
                <SkeletonBox className="h-10 w-24" />
                <SkeletonBox className="h-10 w-24" />
                <SkeletonBox className="h-10 w-24" />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <SkeletonBox className="h-24" />
                <SkeletonBox className="h-24" />
                <SkeletonBox className="h-24" />
                <SkeletonBox className="h-24" />
            </div>

            {/* Main Chart Section */}
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <SkeletonBox className="h-8 w-1/3 mb-4" />
                <SkeletonBox className="h-80" />
            </div>

            {/* Other sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg"><SkeletonBox className="h-6 w-40 mb-4" /><SkeletonBox className="h-64" /></div>
                <div className="bg-gray-800 p-4 rounded-lg"><SkeletonBox className="h-6 w-40 mb-4" /><SkeletonBox className="h-64" /></div>
            </div>

        </div>
    );
};

export default ChannelDetailSkeleton;
