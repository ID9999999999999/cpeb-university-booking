import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
@Injectable() export class RepairTicketsService{
 constructor(private readonly p:PrismaService){}
 mine(reporterId:string){return this.p.repairTicket.findMany({where:{reporterId},include:{equipment:true},orderBy:{createdAt:'desc'}})}
 async create(i:{equipmentId:string,reporterId:string,title:string,description?:string}){if(!i.title?.trim())throw new BadRequestException('Title required');const e=await this.p.equipment.findUnique({where:{id:i.equipmentId}});if(!e)throw new NotFoundException('Resource not found');return this.p.repairTicket.create({data:{equipmentId:i.equipmentId,reporterId:i.reporterId,title:i.title.trim(),description:i.description?.trim()},include:{equipment:true}})}
}