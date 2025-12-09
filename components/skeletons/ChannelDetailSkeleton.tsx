import React from 'react';

const SkeletonBox = ({ className }: { className?: string }) => (
    <div className={`bg-gray-700 rounded-md animate-pulse ${className}`} />
);

const ChannelDetailSkeleton: React.FC = () => {
    return (
        <div className="p-4 md:p-6 lg:p-8 overflow-y-auto h-full">
            {/* Back button */}
            <SkeletonBox className="w-40 h-9 mb-4" />
            
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-grow w-full">
                    <SkeletonBox className="h-10 w-3/4 sm:w-1/2 mx-auto sm:mx-0" />
                    <SkeletonBox className="h-4 w-1/2 sm:w-1/3 mt-2 mx-auto sm:mx-0" />
                    <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                        <div className="w-24"><SkeletonBox className="h-12 w-full" /></div>
                        <div className="w-24"><SkeletonBox className="h-12 w-full" /></div>
                    </div>
                </div>
            </header>
            
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-700">
                <div className="flex space-x-4">
                    <SkeletonBox className="w-20 h-9" />
                    <SkeletonBox className="w-20 h-9" />
                </div>
            </div>

            <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SkeletonBox className="h-24" />
                    <SkeletonBox className="h-24" />
                    <SkeletonBox className="h-24" />
                </div>

                {/* Chart Section */}
                <section>
                    <SkeletonBox className="h-8 w-64 mb-4" />
                    <SkeletonBox className="h-96" />
                </section>

                {/* Video List Section */}
                 <section>
                    <SkeletonBox className="h-8 w-80 mb-4" />
                    <div className="bg-gray-800 rounded-lg p-2 space-y-2">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="flex items-center gap-4 p-2">
                                <SkeletonBox className="w-40 h-[90px] flex-shrink-0" />
                                <div className="flex-grow space-y-2">
                                    <SkeletonBox className="h-4 w-full" />
                                    <SkeletonBox className="h-4 w-2/3" />
                                    <SkeletonBox className="h-3 w-1/2" />
                                </div>
                                <SkeletonBox className="w-24 h-8 flex-shrink-0" />
                           </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ChannelDetailSkeleton;
