'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Plus, Trash2, QrCode, Check, X, AlertCircle, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function PaymentQR() {
    const [qrs, setQrs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        currency: 'INR',
        paymentMethod: 'upi',
        upiId: '',
        minAmount: 100,
        maxAmount: 50000,
        qrCode: ''
    })

    const fetchQRs = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/qr')
            setQrs(response.data.data)
        } catch (error) {
            toast.error('Failed to fetch QR codes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQRs()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData({ ...formData, qrCode: reader.result as string })
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.qrCode) {
            return toast.error('Please upload a QR code image')
        }

        try {
            setUploading(true)
            await api.post('/admin/qr/upload', formData)
            toast.success('QR code uploaded successfully')
            setIsModalOpen(false)
            setFormData({
                currency: 'INR',
                paymentMethod: 'upi',
                upiId: '',
                minAmount: 100,
                maxAmount: 50000,
                qrCode: ''
            })
            fetchQRs()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload QR code')
        } finally {
            setUploading(false)
        }
    }

    const toggleStatus = async (qrId: string, currentStatus: boolean) => {
        try {
            await api.put(`/admin/qr/${qrId}`, { isActive: !currentStatus })
            toast.success(`QR code ${!currentStatus ? 'activated' : 'deactivated'}`)
            fetchQRs()
        } catch (error) {
            toast.error('Failed to update QR status')
        }
    }

    const deleteQR = async (qrId: string) => {
        if (!confirm('Are you sure you want to delete this QR code?')) return
        try {
            await api.delete(`/admin/qr/${qrId}`)
            toast.success('QR code deleted')
            fetchQRs()
        } catch (error) {
            toast.error('Failed to delete QR code')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Payment QRs</h2>
                    <p className="text-gray-400">Manage UPI QR codes for manual deposits.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20"
                >
                    <Plus size={20} />
                    Add New QR
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="glass rounded-2xl border border-white/5 h-64 animate-pulse" />
                    ))
                ) : qrs.length === 0 ? (
                    <div className="col-span-full py-12 text-center glass rounded-2xl border border-white/5">
                        <QrCode className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-500 font-medium">No QR codes found. Add your first one!</p>
                    </div>
                ) : (
                    qrs.map((qr) => (
                        <div key={qr.id} className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                            <div className="relative h-48 bg-white flex items-center justify-center p-4">
                                <img
                                    src={qr.qr_code}
                                    alt="Payment QR"
                                    className="h-full object-contain"
                                />
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase border ${qr.is_active
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {qr.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                            <div className="p-4 flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400">
                                            <IndianRupee size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{qr.upi_id}</p>
                                            <p className="text-xs text-gray-500 capitalize">{qr.payment_method} • {qr.currency}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white/5 p-2 rounded-lg">
                                        <p className="text-gray-500">Min</p>
                                        <p className="font-bold">₹{qr.min_amount}</p>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded-lg">
                                        <p className="text-gray-500">Max</p>
                                        <p className="font-bold">₹{qr.max_amount}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => toggleStatus(qr.id, qr.is_active)}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${qr.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                                    >
                                        {qr.is_active ? <X size={14} /> : <Check size={14} />}
                                        {qr.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => deleteQR(qr.id)}
                                        className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass w-full max-w-md rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Add New Payment QR</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5 text-left">UPI ID</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.upiId}
                                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    placeholder="merchant@upi"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5 text-left">Min Amount</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.minAmount}
                                        onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5 text-left">Max Amount</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.maxAmount}
                                        onChange={(e) => setFormData({ ...formData, maxAmount: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5 text-left">QR Code Image</label>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-primary-500 transition-colors cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {formData.qrCode ? (
                                        <div className="space-y-2">
                                            <img src={formData.qrCode} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                                            <p className="text-xs text-primary-400">Click to change image</p>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <Plus size={32} className="mx-auto text-gray-600 mb-2 group-hover:text-primary-500" />
                                            <p className="text-sm text-gray-500">Click to upload QR image</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary-600/20"
                                >
                                    {uploading ? 'Uploading...' : 'Upload QR Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
